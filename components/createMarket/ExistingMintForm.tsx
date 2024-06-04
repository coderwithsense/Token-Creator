import { FormState, UseFormRegister } from "react-hook-form";
import { CreateMarketFormValues } from "../../src/components/CreateMarket";
import { validatePubkey } from "../../utils/pubkey";

type ExistingMintFormProps = {
  register: UseFormRegister<CreateMarketFormValues>;
  formState: FormState<CreateMarketFormValues>;
};
export default function ExistingMintForm({
  register,
  formState: { errors },
}: ExistingMintFormProps) {
  return (
    <div className="space-y-2">
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 justify-items-center items-center gap-3">
          <div>
            <div className="indicator">
              <span className="indicator-item badge">Base Mint</span>
              <input
                type="text"
                placeholder="Address..."
                className="input input-bordered w-full md:w-[30vw]"
                {...register("existingMints.baseMint", {
                  required: true,
                  validate: validatePubkey,
                })}
              />
            </div>
            {errors?.existingMints?.baseMint ? (
              <p className="text-xs text-red-400 mt-1">
                {errors?.existingMints?.baseMint?.message}
              </p>
            ) : null}
          </div>
          <div>
            <div className="indicator">
              <span className="indicator-item badge">Quote Token</span>
              <input
                type="text"
                placeholder="Address..."
                className="input input-bordered w-full md:w-[30vw]"
                {...register("existingMints.quoteMint", {
                  required: true,
                  validate: validatePubkey,
                })}
              />
            </div>
            {errors?.existingMints?.quoteMint ? (
              <p className="text-xs text-red-400 mt-1">
                {errors?.existingMints?.quoteMint?.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
