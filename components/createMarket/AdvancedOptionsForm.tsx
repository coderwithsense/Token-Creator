import { Switch } from "@headlessui/react";
import { FormState, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { CreateMarketFormValues } from "../../src/components/CreateMarket";
import { ChangeEvent } from "react";
import { classNames } from "../../utils/general";

type AdvancedOptionsFormProps = {
  useAdvancedOptions: boolean;
  register: UseFormRegister<CreateMarketFormValues>;
  formState: FormState<CreateMarketFormValues>;
  setValue: UseFormSetValue<CreateMarketFormValues>;
  totalMarketAccountSizes: {
    totalEventQueueSize: number;
    totalRequestQueueSize: number;
    totalOrderbookSize: number;
  };
};
export default function AdvancedOptionsForm({
  useAdvancedOptions,
  register,
  setValue,
  formState: { errors },
  totalMarketAccountSizes,
}: AdvancedOptionsFormProps) {
  return (
    <div className="px-6" style={{ marginLeft: "4vw" }}>
      <div className="form-control  w-[20%]">
        <label className="cursor-pointer label">
          <span className="label-text">Advance Options</span>
          <input
            type="checkbox"
            checked={useAdvancedOptions}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setValue("useAdvancedOptions", event.target.checked)
            }
            className={classNames(
              useAdvancedOptions ? "bg-cyan-500" : "bg-slate-400",
              "toggle toggle-primary relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-style"
            )}
          />
        </label>
      </div>
      <div
        className={classNames(
          !useAdvancedOptions ? "opacity-30" : "opacity-100"
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="grid grid-cols-1 gap-5">
            <div className="indicator block">
              <span className="indicator-item badge">Event Queue Length</span>
              <input
                type="number"
                placeholder="Type here"
                className="input input-bordered w-full md:w-[30vw] grow"
                {...register("eventQueueLength", {
                  min: {
                    value: 128,
                    message: "Must be at least 128",
                  },
                  max: 2978,
                  required: true,
                })}
              />
              {errors?.eventQueueLength ? (
                <p className="text-xs text-red-400 mt-1">
                  {errors?.eventQueueLength?.message}
                </p>
              ) : null}
            </div>
            <div className="indicator block">
              <span className="indicator-item badge">Request Queue Length</span>
              <input
                type="number"
                placeholder="Type here"
                className="input input-bordered w-full md:w-[30vw] grow"
                {...register("requestQueueLength", {
                  min: 1,
                  max: 63,
                  required: true,
                })}
              />
              {errors?.requestQueueLength ? (
                <p className="text-xs text-red-400 mt-1">
                  {errors?.requestQueueLength?.message}
                </p>
              ) : null}
            </div>
            <div className="indicator block">
              <span className="indicator-item badge">OrderBook Length</span>
              <input
                type="number"
                placeholder="Type here"
                className="input input-bordered w-full md:w-[30vw] grow"
                {...register("orderbookLength", {
                  min: {
                    value: 201,
                    message: "Must be at least 201",
                  },
                  max: 909,
                  required: true,
                })}
              />
              {errors?.orderbookLength ? (
                <p className="text-xs text-red-400 mt-1">
                  {errors?.orderbookLength?.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
